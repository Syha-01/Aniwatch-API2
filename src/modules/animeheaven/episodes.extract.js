import { load } from 'cheerio';

export default function episodesExtract(html) {
  const $ = load(html);

  const response = [];
  
  // They are listed in reverse order usually (from latest to earliest).
  // So we may want to reverse them or just push them.
  $('.trackep0.watch').parent('a').each((i, el) => {
    const obj = {
      title: null,
      alternativeTitle: null,
      id: null,
      isFiller: false,
      episodeNumber: null,
    };
    
    obj.id = $(el).attr('id'); // The episode id
    const epNumStr = $(el).find('.watch2').text().trim();
    obj.episodeNumber = Number(epNumStr);
    obj.title = `Episode ${epNumStr}`;
    obj.alternativeTitle = obj.title;

    response.push(obj);
  });

  // Since AnimeHeaven lists from highest to lowest episode number, reverse the array 
  // so episode 1 is first if that's preferred. AniWatch usually returns Ep 1 first.
  return response.reverse();
}
