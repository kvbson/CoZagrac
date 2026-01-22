import { createApiClient } from '@api/clients/factory.js';

const steamHttp = createApiClient('https://api.steampowered.com/');

export default steamHttp;
