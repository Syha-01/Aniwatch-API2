import streamExtract from './stream.extract.js';
import { NotFoundError } from '@/utils/errors.js';

export default async function streamHandler(c) {
  let { id, server, type } = c.req.query();
  // id is the episode key, e.g. "aa58dabc923a43d7b59e558d4394dd2a"

  try {
    const res = await fetch(`${('https://animeheaven.me')}/gate.php`, {
      headers: {
        ...config.headers,
        Cookie: `key=${id};`,
      },
    });

    const html = await res.text();
    const response = streamExtract(html);
    if (!response || !response.sources || response.sources.length === 0) {
      throw new NotFoundError('Something Went Wrong While Decryption');
    }
    return response;
  } catch (error) {
    throw new NotFoundError('Sources not found');
  }
}
