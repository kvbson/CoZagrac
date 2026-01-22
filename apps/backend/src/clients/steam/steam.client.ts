import { createApiClient } from '@/clients/factory.js';

const steamHttp = createApiClient('https://api.steampowered.com/');

export default steamHttp;
