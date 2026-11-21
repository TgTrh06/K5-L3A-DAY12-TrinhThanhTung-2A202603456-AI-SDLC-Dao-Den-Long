import { handleLeaderboardApi } from './src/leaderboard-api.js';

function leaderboardPlugin() {
    const attach = server => server.middlewares.use((request, response, next) => {
        handleLeaderboardApi(request, response).then(handled => { if (!handled) next(); }).catch(next);
    });
    return { name: 'dao-den-long-local-leaderboard', configureServer: attach, configurePreviewServer: attach };
}

export default { plugins: [leaderboardPlugin()] };
