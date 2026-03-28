import { load } from 'cheerio';

export default function streamExtract(html) {
  const $ = load(html);

  const sources = [];
  
  // Find all video sources inside #vid
  $('#vid source').each((i, el) => {
    const src = $(el).attr('src');
    if (src) {
      sources.push({
        url: src,
        isM3U8: false,
      });
    }
  });

  // Extract the download link if available
  // <a href='https://cv.animeheaven.me/video.mp4?...&d'><div class='boxitem... onclick='dwn()'>Download</div></a>
  let download = null;
  const dwnEl = $('.linetitle2.c a');
  if (dwnEl.length > 0) {
    download = dwnEl.attr('href');
  }

  return {
    sources,
    download,
    tracks: [],
    intro: { start: 0, end: 0 },
    outro: { start: 0, end: 0 },
    referer: 'https://animeheaven.me/',
  };
}
