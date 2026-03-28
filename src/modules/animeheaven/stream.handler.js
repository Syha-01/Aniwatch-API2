import { axiosInstance } from '@/services/animeheaven.axios.js';
import streamExtract from './stream.extract.js';
import { NotFoundError } from '@/utils/errors.js';

export default async function streamHandler(c) {
  let { id, server, type } = c.req.query();
  // id is the episode key, e.g. "aa58dabc923a43d7b59e558d4394dd2a"

  const result = await axiosInstance(`/gate.php`, {
    headers: {
      Cookie: `key=${id};`,
    },
  });

  if (!result.success) {
    throw new NotFoundError('Sources not found');
  }

  const extracted = streamExtract(result.data);
  if (!extracted || !extracted.sources || extracted.sources.length === 0) {
    throw new NotFoundError('Something Went Wrong While Decryption');
  }

  // Normalize response to match the StreamData format the app expects
  const response = {
    link: {
      file: extracted.sources[0].url,
      type: extracted.sources[0].isM3U8 ? 'hls' : 'mp4',
    },
    tracks: extracted.tracks || [],
    intro: extracted.intro,
    outro: extracted.outro,
    referer: extracted.referer,
  };

  return response;
}
