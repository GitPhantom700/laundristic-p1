const https = require('https');

https.get(
  'https://api.github.com/repos/GitPhantom700/laundristic-p1/actions/runs?per_page=1',
  {
    headers: { 'User-Agent': 'NodeJS' },
  },
  (res) => {
    let data = '';
    res.on('data', (chunk) => (data += chunk));
    res.on('end', () => {
      const runs = JSON.parse(data).workflow_runs;
      const jobsUrl = runs[0].jobs_url;

      https.get(jobsUrl, { headers: { 'User-Agent': 'NodeJS' } }, (res2) => {
        let data2 = '';
        res2.on('data', (chunk) => (data2 += chunk));
        res2.on('end', () => {
          const jobs = JSON.parse(data2).jobs;
          for (const job of jobs) {
            console.log(`Job: ${job.name}, Status: ${job.conclusion}`);
            for (const step of job.steps) {
              if (step.conclusion === 'failure') {
                console.log(`  FAILED STEP: ${step.name}`);
              }
            }
          }
        });
      });
    });
  },
);
