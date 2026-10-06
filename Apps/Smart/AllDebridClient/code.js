class AllDebridClient
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
        let result = args.fetch({
            url: url + this.getStatusPath(args),
            timeout: 10
        });

        if (!result.success)
            throw result.content || 'Fetch failed';

        return result.data;
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
            ['Active', this.getNumber(metrics.active_downloads, 0)],
            ['Queued', this.getNumber(metrics.queued_downloads, 0)],
            ['Done', this.getNumber(metrics.completed_count, 0)]
        ];
    }

    getBarInfo(metrics) {
        let completed24h = this.getNumber(metrics.completed_last_24h, 0);
        let completed7d = this.getNumber(metrics.completed_last_7d, 0);
        let errors = this.getNumber(metrics.error_count, 0);
        let successRate = Math.max(0, Math.min(100, this.getNumber(metrics.success_rate_pct, 0)));
        let totalForWindow = Math.max(1, completed7d + errors);

        return [
            {
                label: 'Active',
                percent: Math.max(0, Math.min(100, this.getNumber(metrics.active_downloads, 0) * 10)),
                tooltip: this.getNumber(metrics.active_downloads, 0) + ' active downloads',
                icon: '/common/down.svg'
            },
            {
                label: 'Queue',
                percent: Math.max(0, Math.min(100, this.getNumber(metrics.queued_downloads, 0) * 5)),
                tooltip: this.getNumber(metrics.queued_downloads, 0) + ' queued downloads',
                icon: '/common/list.svg'
            },
            {
                label: '24h Done',
                percent: Math.max(0, Math.min(100, (completed24h / Math.max(1, completed7d)) * 100)),
                tooltip: completed24h + ' completed in the last 24 hours',
                icon: '/common/check.svg'
            },
            {
                label: 'Success',
                percent: successRate,
                tooltip: successRate.toFixed(1) + '% success rate',
                icon: '/common/health.svg'
            },
            {
                label: 'Errors',
                percent: Math.max(0, Math.min(100, (errors / totalForWindow) * 100)),
                tooltip: errors + ' recent errors',
                icon: '/common/warning.svg'
            }
        ];
    }

    getHistoryChart(data, metrics, state) {
        let points = data?.series?.daily_completions;
        if (!points?.length)
            return null;

        let labels = points.map(x => new Date(x.date));
        let chartData = [
            points.map(x => this.getNumber(x.completed, 0))
        ];

        return {
            title: this.getStateLabel(state) + ' | 24h ' + this.getNumber(metrics.completed_last_24h, 0),
            labels,
            data: chartData
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
        return data?.display_name === 'AllDebrid-Client' || data?.service === 'alldebrid-client';
    }
}
