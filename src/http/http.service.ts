import {Injectable} from '@nestjs/common';
import axios, {AxiosInstance, AxiosRequestConfig} from 'axios';

@Injectable()
export class AxiosHttpService {
	readonly axios: AxiosInstance = axios;

	create(config?: AxiosRequestConfig): AxiosInstance {
		return axios.create(config);
	}
}
