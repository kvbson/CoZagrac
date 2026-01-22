import { createApiClient } from '@api/clients/factory.js';

const steamStoreHttp = createApiClient('https://store.steampowered.com/');

export default steamStoreHttp;
