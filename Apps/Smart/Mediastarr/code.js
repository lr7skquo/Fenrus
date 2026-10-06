class Mediastarr
{
    isLarge(args) {
        return args.size === 'large' || args.size === 'larger';
    }

    isXLarge(args) {
        return args.size === 'x-large' || args.size === 'xx-large';
    }

    getNumber(value, fallback) {
        return isNaN(value) ? fallback : Number(value);
    }

    getStatusPath(args) {
        let path = args.properties?.statusPath || '/api/integrations/fenrus/status';
        if (!path)
            path = '/api/integrations/fenrus/status';
        if (path.startsWith('/') === false)
            path = '/' + path;
        return path;
    }

    fetchStatus(args) {
        let url = args.url;
        if (url.endsWith('/'))
            url = url.substring(0, url.length - 1);

        let fetchArgs = {
            url: url + this.getStatusPath(args),
            timeout: 10
        };

        let apiKey = args.properties?.apiKey;
        if (apiKey) {
            fetchArgs.headers = {
                'X-Api-Key': apiKey
            };
        }

        let result = args.fetch(fetchArgs);
        if (!result.success)
            throw result.content || 'Fetch failed';

        let data = result.data;
        if (typeof(data) === 'string')
            data = JSON.parse(data);
        return data;
    }

    getIndicator(state) {
        if (state.level === 'warning' || state.level === 'error')
            return 'Update';
        return '';
    }

    getStateLabel(state) {
        return state.message || state.level || 'Unknown';
    }

    getLiveStats(metrics, state) {
        return [
            ['State', this.getStateLabel(state)],
            ['Today', this.getNumber(metrics.searches_today, 0)],
            ['Online', this.getNumber(metrics.instances_online, 0) + '/' + this.getNumber(metrics.instances_enabled, 0)],
            ['Total', this.getNumber(metrics.total_searches, 0)]
        ];
    }

    getBarInfo(metrics) {
        let dailyLimit = this.getNumber(metrics.daily_limit, 0);
        let today = this.getNumber(metrics.searches_today, 0);
        let enabled = Math.max(1, this.getNumber(metrics.instances_enabled, 0));
        let online = this.getNumber(metrics.instances_online, 0);
        let missing = this.getNumber(metrics.missing_found, 0);
        let upgrades = this.getNumber(metrics.upgrades_found, 0);
        let skipped = this.getNumber(metrics.skipped_cooldown, 0) + this.getNumber(metrics.skipped_daily, 0);

        return [
            {
                label: 'Today',
                percent: dailyLimit > 0 ? Math.max(0, Math.min(100, (today / dailyLimit) * 100)) : Math.max(0, Math.min(100, today)),
                tooltip: dailyLimit > 0 ? today + ' of ' + dailyLimit + ' searches used today' : today + ' searches today',
                icon: '/common/check.svg'
            },
            {
                label: 'Online',
                percent: Math.max(0, Math.min(100, (online / enabled) * 100)),
                tooltip: online + ' of ' + enabled + ' enabled instances online',
                icon: '/common/health.svg'
            },
            {
                label: 'Missing',
                percent: Math.max(0, Math.min(100, missing)),
                tooltip: missing + ' missing items found in the current cycle',
                icon: '/common/search.svg'
            },
            {
                label: 'Upgrades',
                percent: Math.max(0, Math.min(100, upgrades)),
                tooltip: upgrades + ' upgrade candidates found in the current cycle',
                icon: '/common/up.svg'
            },
            {
                label: 'Skipped',
                percent: Math.max(0, Math.min(100, skipped)),
                tooltip: skipped + ' items skipped by cooldown or limits',
                icon: '/common/warning.svg'
            }
        ];
    }

    getHistoryChart(data, metrics, state) {
        let points = data?.series?.daily_searches;
        if (!points?.length)
            return null;

        return {
            title: this.getStateLabel(state) + ' | Today ' + this.getNumber(metrics.searches_today, 0),
            labels: points.map(x => new Date(x.day)),
            data: [
                points.map(x => this.getNumber(x.count, 0))
            ]
        };
    }

    status(args) {
        let data = this.fetchStatus(args);
        let metrics = data?.metrics;
        let state = data?.state;
        if (!metrics || !state)
            throw 'No data returned';

        args.setStatusIndicator(this.getIndicator(state));

        if (this.isXLarge(args)) {
            let chart = this.getHistoryChart(data, metrics, state);
            if (chart)
                return args.chart.line(chart);
        }

        if (this.isLarge(args) || this.isXLarge(args))
            return args.barInfo(this.getBarInfo(metrics));

        return args.liveStats(this.getLiveStats(metrics, state));
    }

    test(args) {
        let data = this.fetchStatus(args);
        return data?.display_name === 'Mediastarr' || data?.service === 'mediastarr';
    }
}
