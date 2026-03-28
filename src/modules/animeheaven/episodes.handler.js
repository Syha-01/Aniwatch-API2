
import { axiosInstance } from '@/services/animeheaven.axios.js';
import episodesExtract from './episodes.extract';
import { NotFoundError } from '@/utils/errors';

export default async function episodesHandler(c) {
  const { id } = c.req.param();

  const result = await axiosInstance(`/anime.php?${id}`);
  if (!result.success) {
    throw new NotFoundError('episodes Not Found');
  }
  const response = episodesExtract(result.data);
  return response;
}
