import { axiosInstance } from '@/services/animeheaven.axios.js';
import connectRedis from '@/utils/connectRedis';
import { validationError } from '@/utils/errors';
import infoExtract from './info.extract.js';

export default async function animeInfo(c) {
  const { id } = c.req.param();

  const { exist, redis } = await connectRedis();
  if (!exist) {
    const result = await axiosInstance(`/anime.php?${id}`);
    if (!result.success) {
      throw new validationError(result.message, 'maybe id is incorrect : ' + id);
    }
    const response = infoExtract(result.data);
    return response;
  } else {
    const detail = await redis.get(id);
    if (detail) {
      return detail;
    }

    const result = await axiosInstance(`/anime.php?${id}`);
    if (!result.success) {
      throw new validationError(result.message, 'maybe id is incorrect : ' + id);
    }
    const response = infoExtract(result.data);

    await redis.set(id, JSON.stringify(response), {
      ex: 60 * 60 * 24,
    });
    return response;
  }
}
