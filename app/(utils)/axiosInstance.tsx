import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from 'axios';
 


const getToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem("authToken");
  } catch (error) {
    console.error("Error getting token:", error);
    return null;
  }
};

const createAxiosInstance = (baseURL: string): AxiosInstance => {
  const instance: AxiosInstance = axios.create({
    baseURL: baseURL,
    timeout: 10000,  
    headers: {
      'Content-Type': 'application/json',
    },
  });

  instance.interceptors.request.use(
    async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
      const token: string | null = await getToken();
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error: AxiosError): Promise<AxiosError> => Promise.reject(error)
  );

  return instance;
};

// const URL = "https://live-tracking-4e7b.onrender.com"
const URL = "https://live-tracking-kpuj.onrender.com"

export const rootApi: AxiosInstance = createAxiosInstance(URL);