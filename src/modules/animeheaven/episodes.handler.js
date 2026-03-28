
import episodesExtract from './episodes.extract';
import { NotFoundError } from '@/utils/errors';

export default async function episodesHandler(c) {
  const { id } = c.req.param();

  try {
    const res = await fetch(`${('https://animeheaven.me')}/anime.php?${id}`, {
      headers: config.headers,
    });

    const html = await res.text();
    const response = episodesExtract(html);
    return response;
  } catch (err) {
    console.log(err.message);
    throw new NotFoundError('episodes Not Found');
  }
}
