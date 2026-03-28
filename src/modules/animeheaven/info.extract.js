import { commonAnimeObj, episodeObj } from '@/utils/commonAnimeObj';
import { load } from 'cheerio';


export default function infoExtract(html) {
  const $ = load(html);

  const obj = {
    ...commonAnimeObj(),
    ...episodeObj(),
    rating: null,
    type: null,
    is18Plus: false,
    synopsis: null,
    synonyms: null,
    aired: {
      from: null,
      to: null,
    },
    premiered: null,
    duration: null,
    status: null,
    MAL_score: null,
    genres: [],
    studios: [],
    producers: [],
    moreSeasons: [],
    related: [],
    mostPopular: [],
    recommended: [],
  };

  const infoDiv = $('.info.bc1');
  const imgSrc = infoDiv.find('.infoimg img').attr('src') || '';
  obj.poster = imgSrc.startsWith('http') ? imgSrc : `${('https://animeheaven.me')}/${imgSrc}`;
  
  obj.title = infoDiv.find('.infodiv .infotitle').text().trim();
  obj.alternativeTitle = infoDiv.find('.infodiv .infotitlejp').text().trim();
  obj.synopsis = infoDiv.find('.infodiv .infodes').text().trim();

  infoDiv.find('.infotags a').each((i, el) => {
    obj.genres.push($(el).text().trim());
  });

  const infoYearText = infoDiv.find('.infoyear').text();
  // "Episodes: 25 Year: 2019 Score: 8.6/10"
  
  const episodesMatch = infoYearText.match(/Episodes:\s*(\d+|\?)/);
  if (episodesMatch && episodesMatch[1] !== '?') {
    obj.episodes.eps = Number(episodesMatch[1]);
    obj.episodes.sub = Number(episodesMatch[1]);
  }

  const yearMatch = infoYearText.match(/Year:\s*(\d{4})/);
  if (yearMatch) {
    obj.aired.from = yearMatch[1];
  }

  const scoreMatch = infoYearText.match(/Score:\s*([\d.]+)\/10/);
  if (scoreMatch) {
    obj.MAL_score = scoreMatch[1];
  }

  // animeheaven.me sets the current url or ID in a bookmark button
  // Wait, the id is already known from the API call, but we can extract it:
  const bookId = infoDiv.find('.book3.bc2.c1 .book2.bc2.c1').attr('id');
  if (bookId) {
    obj.id = bookId.replace('r-', ''); 
  }

  // Parse Related / Similar shows (AnimeHeaven uses .linetitle & .info3)
  const boldtexts = $('.boldtext');
  
  boldtexts.each((i, el) => {
    // Find all titles in this block (Related Shows, Similar Shows)
    const titles = $(el).find('.linetitle');
    const info3s = $(el).find('.info3');
    
    titles.each((tIndex, titleEl) => {
      const titleText = $(titleEl).text().trim();
      const info3ObjEl = info3s.eq(tIndex);
      
      if (!info3ObjEl) return;
      
      const parsedDoms = [];
      info3ObjEl.find('.similarimg').each((idx, simEl) => {
        const simObj = {
          title: null,
          alternativeTitle: null,
          id: null,
          poster: null,
        };
        const anchor = $(simEl).find('a').first();
        const href = anchor.attr('href') || '';
        simObj.id = href.split('?')[1] || href;
        
        const simImgSrc = anchor.find('img').attr('src') || '';
        simObj.poster = simImgSrc.startsWith('http') ? simImgSrc : `${('https://animeheaven.me')}/${simImgSrc}`;
        simObj.title = $(simEl).find('.similarname a').text().trim();

        parsedDoms.push(simObj);
      });

      if (titleText === 'Related Shows') {
        obj.related = parsedDoms;
        // AnimeHeaven puts seasons here, we can consider them moreSeasons as well
        obj.moreSeasons = parsedDoms.map(d => ({ ...d, isActive: false }));
      } else if (titleText === 'Similar Shows') {
        obj.recommended = parsedDoms;
      }
    });
  });

  return obj;
}
