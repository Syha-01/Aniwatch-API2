import { Hono } from 'hono';
import withTryCatch from '@/utils/withTryCatch';

import homeHandler from '../modules/animeheaven/home.handler.js';
import searchHandler from '../modules/animeheaven/search.handler.js';
import animeInfoHandler from '../modules/animeheaven/animeInfo.handler.js';
import episodesHandler from '../modules/animeheaven/episodes.handler.js';
import streamHandler from '../modules/animeheaven/stream.handler.js';

const animeHeavenRouter = new Hono();

animeHeavenRouter.get('/home', withTryCatch(homeHandler));
animeHeavenRouter.get('/search', withTryCatch(searchHandler));
animeHeavenRouter.get('/anime/:id', withTryCatch(animeInfoHandler));
animeHeavenRouter.get('/episodes/:id', withTryCatch(episodesHandler));
animeHeavenRouter.get('/stream', withTryCatch(streamHandler));

export default animeHeavenRouter;
