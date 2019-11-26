#!/bin/bash

# http://redsymbol.net/articles/unofficial-bash-strict-mode/
set -euo pipefail
IFS=$'\n\t'

# Colorized output
# $1: string to print
# $2: (optional) color or other formatting number, see https://misc.flogisoft.com/bash/tip_colors_and_formatting
message() {
		BLUE="34"
		DEFAULT="0"

		OUTPUT=${1:-}

		# Use color from $2 if provided, otherwise use blue
		COLOR=${2:-$BLUE}

		printf "\\e[${COLOR}m%s\\e[${DEFAULT}m\\n" "$OUTPUT"
}

# Log a message to stderr and exit with an error code
# $1: string to print
fatal() {
		OUTPUT=${1:-}
		RED="31"
		message "error: $OUTPUT" "$RED" >&2
		exit 1
}

# Log a warning
# $1: string to print
warn() {
		OUTPUT=${1:-}
		YELLOW="33"
		message "warning: $OUTPUT" "$YELLOW"
}

# Confirm if a user wants to do something
# Bypasses the prompt and proceeds if the variable SHOULD_CONFIRM is set to 0
# $1: message, defaults to 'Proceed?'
# returns 0 or 1 depending on user input, 0 means no, 1 means yes
confirm() {
		# Whether or not to skip prompt
		# Use value of SHOULD_CONFIRM; if not set, default to 1 (skip prompt)
		SHOULD_PROMPT=${SHOULD_CONFIRM:-1}
		if [[ "$SHOULD_PROMPT" = 1 ]]; then
				return 0 # automatic yes
		fi

		MESSAGE=${1:-"Proceed?"}
		read -p "$MESSAGE (y/n) " -n 1 -r
		message
		[[ $REPLY =~ ^[Yy]$ ]] # REPLY is automatically set to the result of `read`
		return $? # result of previous line, either 0 (yes) or 1 (no)
}

# Prompt the user for their password with a custom message
# If any arguments are provided, they will be passed to sudo
# If no arguments are provided, update the user's cached credentials and extend the sudo timeout for five minutes
request-sudo() {
		SUDO_PROMPT="Enter the system password for user %p: "
		if [[ $# -eq 0 ]]; then
				sudo --validate --prompt "$SUDO_PROMPT"
		else
				sudo --prompt "$SUDO_PROMPT" "$@"
		fi
}

# Look for a virtual environment
running-in-vm() {
		if request-sudo dmidecode | grep -i product | grep -q -i -e vmware -e virtualbox -e parallels; then
				return 0
		fi
		return 1
}

# All script functionality is inside this function to make logging to a file possible.
# $1: Whether or not the script should prompt the user before each step. Set to 0 to enable or 1 to disable
#     (defaults to 1).
main() {

	message "This script will bootstrap your system."

	# Default to 1 (do not confirm before each step)
	SHOULD_CONFIRM=${1:-1}

	# Log command line argument help if the argument was not used
	if (( $SHOULD_CONFIRM )); then
			message "Run this script with '--confirm' or '-c' to be prompted before each step."
	fi

	message "Prompting for password if necessary..."
	request-sudo || fatal "Must have sudo access to proceed"

	# Determine if Strap is running interactively
	STDIN_FILE_DESCRIPTOR="0"
	[ -t "$STDIN_FILE_DESCRIPTOR" ] && STRAP_INTERACTIVE="1"

	# Determine if Strap is running in continuous integration (variable CI is set to true when running in CI)
	STRAP_CI=${CI:-}

	# Initialize Artifactory setup variables
	ARTIFACTORY_API_TOKEN=""
	ARTIFACTORY_SETUP_NPM='0'
	ARTIFACTORY_SETUP_DOCKER='0'
	STRAP_GITHUB_USER_LOWER=""
	NPM_AUTH_KEY=${ARTIFACTORY_BASE_URL#*:}

	# Check Artifactory access
	if [[ -n "$STRAP_GITHUB_USER" ]]; then
			message "Checking Artifactory access..."
			STRAP_GITHUB_USER_LOWER=$(echo "${STRAP_GITHUB_USER}" | tr '[:upper:]' '[:lower:]')
			# Check if Artifactory is already set up for npm
			if [[ -f ~/.npmrc ]]; then
					set +e
					grep --fixed-strings --silent "${NPM_AUTH_KEY}api/npm/${ARTIFACTORY_NPM_REPO}/:_password" ~/.npmrc
					RESULT="${?}"
					set -e
					if [[ "${RESULT}" == '0' ]]; then
							ARTIFACTORY_SETUP_NPM='1'
							message "Artifactory is already set up for npm."
					fi
			fi

			# Get info we need to setup artifactory, if needed
			if [[ ( "${ARTIFACTORY_SETUP_NPM}" == '0' || "${ARTIFACTORY_SETUP_DOCKER}" == '0' ) && -z "$ARTIFACTORY_API_TOKEN" ]]; then
					message "Gathering user input for Artifactory access..."
					message "Navigate to ${ARTIFACTORY_BASE_URL} and log in with github"
					message "Then click 'Welcome, ${STRAP_GITHUB_USER}!' and generate an API token"
					read -r -p 'Enter your Artifactory API token: ' ARTIFACTORY_API_TOKEN
					message
					message "Done gathering user input for Artifactory access."
			fi
			message "Done checking Artifactory access."
	fi

	if confirm "Set up operating system?"; then

			if [[ $(uname) == 'Darwin' ]]; then

					message "Setting up macOS..."

					message "Checking full-disk encryption and enabling if necessary..."
					if fdesetup status | grep --quiet -E "FileVault is (On|Off, but will be enabled after the next restart)."; then
							message "OK"
					elif [ -n "$STRAP_CI" ]; then
							message
							message "Skipping full-disk encryption for CI"
					elif [ -n "$STRAP_INTERACTIVE" ]; then
							message
							message "Enabling full-disk encryption on next reboot"
							request-sudo fdesetup enable -user "$USER" | tee ~/Desktop/"FileVault Recovery Key.txt"
							message "OK"
					else
							message
							fatal "run 'sudo fdesetup enable -user \"$USER\"' to enable full-disk encryption"
					fi
					message "Done checking/enabling full-disk encryption."

					message "Enabling security settings..."
					# Disable Java in Safari
					defaults write com.apple.Safari com.apple.Safari.ContentPageGroupIdentifier.WebKit2JavaEnabled -bool false
					defaults write com.apple.Safari \
							com.apple.Safari.ContentPageGroupIdentifier.WebKit2JavaEnabledForLocalFiles -bool false

					# Ask for password immediately after screensaver starts
					defaults write com.apple.screensaver askForPassword -int 1
					defaults write com.apple.screensaver askForPasswordDelay -int 0

					# Enable and start firewall
					request-sudo defaults write /Library/Preferences/com.apple.alf globalstate -int 1
					request-sudo launchctl load /System/Library/LaunchDaemons/com.apple.alf.agent.plist 2>/dev/null
					message "Done enabling security settings."

					message "Setting login screen message..."
					if [ -n "$STRAP_GIT_NAME" ] && [ -n "$STRAP_GIT_EMAIL" ]; then
							request-sudo defaults write /Library/Preferences/com.apple.loginwindow LoginwindowText \
									"Found this computer? Please contact $STRAP_GIT_NAME at $STRAP_GIT_EMAIL."
					else
							warn "could not set login screen message because 'STRAP_GIT_NAME' and/or 'STRAP_GIT_EMAIL' are not set"
					fi
					message "Done setting login screen message."

					message "Setting up Homebrew..."
					# Install Homebrew if missing
					if [[ -z $(command -v brew) ]]; then
							message "Installing Homebrew..."
							# Install Homebrew and suppress its confirmation prompt so it does not stop the script
							/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)" \
									</dev/null
					fi

					message "Adding Homebrew taps and extensions..."
					brew tap homebrew/cask
					brew tap homebrew/cask-drivers
					brew tap homebrew/core
					brew tap homebrew/services
					message "Done adding Homebrew taps and extensions."

					# Check if directory is writable, if not, take ownership of it
					message "Checking ownership of subdirectories of /usr/local..."
					for dir in $(brew --prefix)/*; do
							if [ ! -w "$dir" ]; then
									request-sudo chown -R "$(whoami)" "$dir"
									message "Took ownership of $dir"
							fi
					done
					message "Done checking/taking ownership of subdirectories of /usr/local."

					message "Updating Homebrew package lists..."
					brew update
					message "Done updating Homebrew package lists."

					message "Done setting up Homebrew."

					message "Checking for software updates..."
					if softwareupdate -l 2>&1 | grep --quiet "No new software available."; then
							message "No software updates available."
					else
							message "Installing software updates..."
							if [ -z "$STRAP_CI" ]; then
									request-sudo softwareupdate --install --all
									message "Installing software updates."
							else
									message "Skipping software updates for CI."
							fi
					fi
					message "Done checking for software updates."

					message "Installing tools needed by later parts of this script..."
					brew install coreutils bash
					brew link coreutils
					message "Done installing tools."

					message "Done setting up macOS."

			elif [[ $(uname) == 'Linux' ]]; then

					message "Setting up Linux..."

					# Distro identification from https://askubuntu.com/a/459406
					PLATFORM=$(python3 -mplatform)

					if printf "%s" "$PLATFORM" | grep --quiet --ignore-case -e Ubuntu -e Debian ; then
							message "Running on Ubuntu/Debian"

							message "Updating software..."
							request-sudo apt update
							request-sudo apt upgrade -y
							message "Done updating software."

							message "Installing tools needed by later parts of this script..."
							request-sudo apt install -y git curl ca-certificates dmidecode
							message "Done installing tools."

							#TODO: check for FDE instead / in addition
							message "Checking home directory encryption..."

							# Only check for encryption if NOT running in a VM
							if running-in-vm; then
									message "Skiping disk encryption check - running inside a Virtual Machine"
							else
									# Check if a directory `/home/.ecryptfs` exists (see https://askubuntu.com/a/146512/799875)
									if [ -d "/home/.ecryptfs" ]; then
											# TODO: this is a terribly inaccurate check
											message "Home directory encryption is enabled."
									else
											# check for LUKS ... this is much harder
											homedev="$(df --portability $HOME | tail -n1 | awk '{print $1}')"
											homedev="${homedev##*/}"
											foundluks=
											# need to temp set IFS back to normal
											IFS=$' \n\t'
											while read dev fstype ; do
													if [[ "$dev" != "$homedev" && "$dev" != \`* ]]; then
															break
													elif [[ "$fstype" == *crypt* ]]; then
															foundluks="$dev $fstype"
															break
													fi
											done < <( lsblk --fs --ascii --inverse --output=name,fstype | grep -A10 "^$homedev" )
											IFS=$'\n\t'
											if [ "$foundluks" ]; then
													message "Found home directory backed by encrypted device: $foundluks"
											else
													message "Home directory is not encrypted. Follow the instructions here:"
													message "https://www.howtogeek.com/116032/how-to-encrypt-your-home-folder-after-installing-ubuntu/"
													fatal "home directory must be encrypted to proceed; run this script again when it is encrypted"
											fi
									fi
									message "Done checking home directory encryption."
							fi
					else
							if [[ -n "$PLATFORM" ]]; then
									message "Running on $PLATFORM"
							else
									message "Could not detect current platform."
							fi

							message "This script cannot check or enable home directory encryption for your platform. Enable it manually."

							if [[ -n $(command -v yum) ]]; then
									message "Updating software..."
									sudo yum update
									message "Done updating software."

									message "Installing tools needed by later parts of this script..."
									sudo yum install -y git curl
									message "Done installing tools."
							elif [[ -n $(command -v pacman) ]]; then
									message "Updating software..."
									sudo pacman -Syu
									message "Done updating software."

									message "Installing tools needed by later parts of this script..."
									sudo pacman -S git curl
									message "Done installing tools."
							else
									message "This script cannot update software on your platform. Please update manually."
							fi

					fi

					message "Checking system memory..."

					readonly PHYS=$(cat /proc/meminfo | grep MemTotal | awk '{ print $2; }')
					readonly SWAP=$(cat /proc/meminfo | grep SwapTotal | awk '{ print $2; }')

					readonly TOTAL=$(( $PHYS + $SWAP ))
					readonly TARGET=$(( 16 * 1024 * 1024 ))
					readonly MINPHYS=$(( 8 * 1024 * 1024 ))

					if [ $TOTAL -lt $TARGET ]; then
						if [ $PHYS -lt $MINPHYS ]; then
							if running-in-vm; then
								warn "You should set your VM memory size to at least ${MINPHYS}G (you only have ${PHYS}G)"
								warn "  ** For Parallels on MacOS, add 'devices.pci_balloon=0' to the 'Boot flags' field under 'Boot Order'"
								fatal "Update your VM settings before proceeding"
							fi
								warn "Your system should have at least ${MINPHYS}G of memory"
						else
							readonly NEWSWAP=$(( $TARGET - $TOTAL ))
							if [ ! -f /mnt/swapfile ]; then
								message "Creating ${NEWSWAP}GB swapfile"
								sudo dd if=/dev/zero of=/mnt/swapfile bs=1024 count=$NEWSWAP
								sudo chmod 600 /mnt/swapfile
								sudo mkswap /mnt/swapfile
								sudo swapon /mnt/swapfile
								echo "/mnt/swapfile swap swap defaults 0 0" | request-sudo tee -a /etc/fstab
							else
								if [ $(( $NEWSWAP / 1024 / 1024 )) -gt 0 ]; then
									warn "You should increase the size of the /mnt/swapfile by $(( $NEWSWAP / 1024 / 1024 ))GB"
								fi
							fi
						fi
					fi

					message "Done checking system memory."

					message "Done setting up Linux."

			else
					warn "this script cannot set up your operating system; moving on to other tasks"
			fi

	fi

	if confirm "Set up Artifactory access for npm?"; then
			message "Setting up Artifactory access for npm..."

			if [[ -n "$STRAP_GITHUB_USER" ]]; then
					# Set up Artifactory
					if [[ "${ARTIFACTORY_SETUP_NPM}" == '0' ]]; then
							# Get npm config from Artifactory API, failing on HTTP errors, and output it to ~/.npmrc
							if curl \
									--user "${STRAP_GITHUB_USER_LOWER}:${ARTIFACTORY_API_TOKEN}" \
									--fail \
									--silent \
									"${ARTIFACTORY_BASE_URL}/api/npm/${ARTIFACTORY_NPM_REPO}/auth/${ARTIFACTORY_NPM_PACKAGE_SCOPE}" --output ~/.npmrc; then
									message "Done setting up Artifactory."
							else
									fatal "Failed to set up Artifactory. Did you enter your token correctly?"
							fi
					else
							message "Artifactory access for npm is already set up."
					fi
					message "Done setting up Artifactory access for npm."
			else
					warn "could not set up Artifactory access for npm because 'STRAP_GITHUB_USER' is not set"
			fi
	fi

	if confirm "Configure Git?"; then
			message "Configuring Git..."
			if [[ -n "$STRAP_GIT_NAME" ]]; then
					git config --global user.name "$STRAP_GIT_NAME"
			else
					warn "could not set Git user name because 'STRAP_GIT_NAME' is not set"
			fi

			if [[ -n "$STRAP_GIT_EMAIL" ]]; then
					git config --global user.email "$STRAP_GIT_EMAIL"
			else
					warn "could not set Git user email because 'STRAP_GIT_EMAIL' is not set"
			fi

			if [[ -n "$STRAP_GITHUB_USER" ]]; then
					git config --global github.user "$STRAP_GITHUB_USER"
			else
					warn "could not set Git GitHub user because 'STRAP_GITHUB_USER' is not set"
			fi

			# Squelch git 2.x warning message when pushing
			if ! git config push.default > /dev/null; then
					git config --global push.default simple
			fi
			message "Done configuring Git."
	fi

	if confirm "Configure Github?"; then

			message "Configuring GitHub..."
			if [[ $(uname) == 'Darwin' ]]; then
					# See https://help.github.com/articles/caching-your-github-password-in-git/#platform-mac
					git config --global credential.helper osxkeychain
			elif [[ $(uname) == 'Linux' ]]; then
					# See https://help.github.com/articles/caching-your-github-password-in-git/#platform-linux

					git config --global credential.helper cache

					# Set cache timeout to one year (a long, arbitrary duration)
					git config --global credential.helper 'cache --timeout=31557600'
					message "  note: GitHub credentials will expire in one year"
			else
					warn "cannot configure GitHub on this operating system"
			fi

			if [ -n "$STRAP_GITHUB_USER" ] && [ -n "$STRAP_GITHUB_TOKEN" ]; then
					# Input to `git credential` must come from stdin and must be terminated with a blank line
					# Documentation for `git credential`: https://git-scm.com/docs/git-credential
					git credential approve <<-EOF
	protocol=https
	host=github.com
	username=$STRAP_GITHUB_USER
	password=$STRAP_GITHUB_TOKEN

	EOF
			else
					warn "could not set up GitHub authentication because 'STRAP_GITHUB_USER' and/or"\
					" 'STRAP_GITHUB_TOKEN' are not set"
			fi

			if [ -n "$STRAP_GITHUB_USER" ]; then
					if confirm "Setup SSH for GitHub?"; then
							if [ ! -d ~/.ssh ]; then
									mkdir ~/.ssh
							else
									message "SSH folder already exists"
							fi
							if [ ! -f ~/.ssh/id_rsa ]; then
									message "Creating SSH key"
									ssh-keygen -q -N '' -t rsa -b 4096 -C "$STRAP_GITHUB_USER" -f ~/.ssh/id_rsa
							else
									message "SSH key already exists"
							fi

							# Trust GitHub SSH key to prevent prompt from Git (https://serverfault.com/a/701637/233125)
							echo 'github.com ssh-rsa AAAAB3NzaC1yc2EAAAABIwAAAQEAq2A7hRGmdnm9tUDbO9IDSwBK6TbQa+PXYPCPy6rbTrTtw7PHkccKrpp0yVhp5HdEIcKr6pLlVDBfOLX9QUsyCOV0wzfjIJNlGEYsdlLJizHhbn2mUjvSAHQqZETYP81eFzLQNnPHt4EVVUh7VfDESU84KezmD5QlWpXLmvU31/yMf+Se8xhHTvKSCZIFImWwoG6mbUoWf9nzpIoaSjB+weqqUUmpaaasXVal72J+UX2B+2RPW3RcT0eOzQgqlJL3RKrTJvdsjE3JEAvGq3lGHSZXy28G3skua2SmVi/w4yCE6gbODqnTWlg7+wC604ydGXA8VJiS5ap43JXiUFFAaQ==' \
							>> ~/.ssh/known_hosts

							if ! ssh -T git@github.com 2>&1 | grep -q success; then
									message "Go to github.com"
									message "Settings -> SSH and GPG keys -> New SSH key"
									cat ~/.ssh/id_rsa.pub
									message "Copy the output above into the input field and save it"
									read -p "Press <enter> to continue"
							else
									message "GitHub already setup for SSH"
							fi
					fi
			fi

			message "Done configuring GitHub..."
	fi

	# Execute Custom Script
	execCustomScript
}

# Argument parsing from https://stackoverflow.com/a/14203146/1850656
set +u
POSITIONAL=()
while [[ $# -gt 0 ]]; do
	key="$1"

	case $key in
		-c|--confirm)
			ARG_CONFIRM=0
			shift # past argument
		;;
		*) # unknown option
			POSITIONAL+=("$1") # save it in an array for later
			shift # past argument
		;;
	esac
done
set -- "${POSITIONAL[@]}" # restore positional parameters
set -u

SHOULD_CONFIRM=${ARG_CONFIRM:-}

# Make unique filename (ex: 2018-07-25-13-05-24-strap-log.txt)
LOG_FILE="$(date +"%Y-%m-%d-%H-%M-%S")-strap-log.txt"
message "Logging output to $LOG_FILE"

# Redirect stdout and stderr to a file
# note: runs in a subshell to ensure that stderr/stdout are in the correct order
(main $SHOULD_CONFIRM 2>&1) | tee -a "$LOG_FILE"
