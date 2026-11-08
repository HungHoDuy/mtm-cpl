import fs from 'fs';

const html = fs.readFileSync('D:/mtm/scratch/match_LC2TR4Y2.html', 'utf8');

// Look for NEXT_DATA or state
const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
if (nextDataMatch) {
  const nextData = JSON.parse(nextDataMatch[1]);
  fs.writeFileSync('d:/mtm/scratch/lc2tr4y2_next_data.json', JSON.stringify(nextData, null, 2));
  console.log('Saved __NEXT_DATA__!');
  const pageProps = nextData.props?.pageProps;
  console.log('pageProps keys:', Object.keys(pageProps || {}));
  if (pageProps?.match) {
    console.log('Match keys:', Object.keys(pageProps.match));
    console.log('Match status:', pageProps.match.status);
    console.log('Match startedAt:', pageProps.match.startedAt);
    console.log('Match endedAt:', pageProps.match.endedAt);
  }
} else {
  console.log('No __NEXT_DATA__ found, checking for embedded JSON or hydration scripts');
  // Check self.__next_f or other patterns
  const matches = [...html.matchAll(/self\.__next_f\.push\(\[1,"(.*?)"\]\)/g)];
  console.log('Found next_f chunks:', matches.length);
}

