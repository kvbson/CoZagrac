import { createApiClient } from '@/clients/factory.js';

const steamStoreHttp = createApiClient('https://store.steampowered.com/');

export default steamStoreHttp;
