import { axiosInstance } from '@/services/animeheaven.axios.js';
import { validationError } from '@/utils/errors';
import homeExtract from './home.extract';

import connectRedis from '@/utils/connectRedis';

export default async function homeHandler() {
  const { exist, redis } = await connectRedis();

  if (!exist) {
    const result = await axiosInstance('/popular.php');
    if (!result.success) {
      throw new validationError(result.message);
    }
    const response = homeExtract(result.data);
    return response;
  }

  const homePageData = await redis.get('animeheaven_home');
  if (homePageData) {
    return homePageData;
  }
  const result = await axiosInstance('/popular.php');
  if (!result.success) {
    throw new validationError(result.message);
  }
  const response = homeExtract(result.data);
  await redis.set('animeheaven_home', JSON.stringify(response), {
    ex: 60 * 60 * 24,
  });
  return response;
}
