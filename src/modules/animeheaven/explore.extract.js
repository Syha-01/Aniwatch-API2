import { commonAnimeObj, episodeObj } from '@/utils/commonAnimeObj';
import { load } from 'cheerio';


export default function exploreExtract(html) {
  const $ = load(html);

  const response = [];
  
  // Search results use `.similarimg .p1`
  // Some lists might use `.chart`
  const searchResults = $('.similarimg .p1');
  const chartResults = $('.chart');

  if (searchResults.length > 0) {
    searchResults.each((i, el) => {
      const obj = {
        ...commonAnimeObj(),
        ...episodeObj(),
        type: null,
        duration: null,
      };

      const anchor = $(el).find('a').first();
      const href = anchor.attr('href') || '';
      obj.id = href.split('?')[1] || href;
      
      const imgSrc = anchor.find('img').attr('src') || '';
      obj.poster = imgSrc.startsWith('http') ? imgSrc : `${('https://animeheaven.me')}/${imgSrc}`;

      const titleEl = $(el).find('.similarname a');
      obj.title = titleEl.text();
      obj.alternativeTitle = titleEl.text(); // Not provided in search

      response.push(obj);
    });
  } else if (chartResults.length > 0) {
    chartResults.each((i, el) => {
      const obj = {
        ...commonAnimeObj(),
        ...episodeObj(),
        type: null,
        duration: null,
      };

      const anchor = $(el).find('.chartimg a');
      const href = anchor.attr('href') || '';
      obj.id = href.split('?')[1] || href;
      
      const imgSrc = anchor.find('img').attr('src') || '';
      obj.poster = imgSrc.startsWith('http') ? imgSrc : `${('https://animeheaven.me')}/${imgSrc}`;

      const titleEl = $(el).find('.chartinfo .charttitle a');
      obj.title = titleEl.text();
      obj.alternativeTitle = $(el).find('.chartinfo .charttitlejp').text();

      response.push(obj);
    });
  }

  // animeheaven.me pagination parsing (if it applies in some pages, otherwise default to 1)
  let currentPage = 1;
  let hasNextPage = false;
  let totalPages = 1;

  const pageInfo = {
    totalPages,
    currentPage,
    hasNextPage,
  };
  return { pageInfo, response };
}
