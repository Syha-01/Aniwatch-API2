import { commonAnimeObj, episodeObj } from '@/utils/commonAnimeObj';
import { load } from 'cheerio';


export default function homeExtract(html) {
  const $ = load(html);

  const response = {
    spotlight: [],
    trending: [],
    topAiring: [],
    mostPopular: [],
    mostFavorite: [],
    latestCompleted: [],
    latestEpisode: [],
    newAdded: [],
    topUpcoming: [],
    topTen: {
      today: null,
      week: null,
      month: null,
    },
    genres: [],
  };

  const $popular = $('.chart');

  $($popular).each((i, el) => {
    const obj = {
      ...commonAnimeObj(),
      ...episodeObj(),
      rank: null,
      type: null,
      quality: null,
      duration: null,
      aired: null,
      synopsis: null,
    };
    
    obj.rank = i + 1;
    const anchor = $(el).find('.chartimg a');
    const href = anchor.attr('href') || '';
    obj.id = href.split('?')[1] || href;
    const imgSrc = anchor.find('img').attr('src') || '';
    obj.poster = imgSrc.startsWith('http') ? imgSrc : `${('https://animeheaven.me')}/${imgSrc}`;
    
    const titleEl = $(el).find('.chartinfo .charttitle a');
    obj.title = titleEl.text();
    obj.alternativeTitle = $(el).find('.chartinfo .charttitlejp').text();

    // AnimeHeaven popular list is generic, so we populate multiple fields
    // to ensure the frontend displays them.
    response.trending.push(obj);
    response.spotlight.push(obj);
    response.topAiring.push(obj);
  });

  return response;
}
