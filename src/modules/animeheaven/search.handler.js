import exploreExtract from './explore.extract.js';
import { axiosInstance } from '@/services/animeheaven.axios.js';
import createEndpoint from '@/utils/createEndpoint';
import { NotFoundError, validationError } from '@/utils/errors';

export default async function searchHandler(c) {
  let { page, keyword } = c.req.query();
  page = page || 1;

  console.log(keyword);

  const endpoint = createEndpoint(`search.php?s=${keyword}`, page);

  console.log(endpoint);

  const result = await axiosInstance(endpoint);

  if (!result.success) {
    throw new validationError('make sure given endpoint is correct');
  }
  const response = exploreExtract(result.data);

  if (response.response.length < 1) throw new NotFoundError();
  return response;
}
