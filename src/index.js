export default {
  async fetch(request) {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const ep = url.searchParams.get('ep') || '1';
    const mode = url.searchParams.get('mode') || 'sub';

    if (!id) {
      return new Response('Missing anime id', { status: 400 });
    }

    try {
      const sources = await getKwikSources(id, ep, mode);

      if (sources && sources.length > 0) {
        const best = sources.find(s => s.quality && (s.quality.includes('1080') || s.quality.includes('720'))) || sources[0];
        return Response.redirect(best.url, 302);
      }

      return new Response('No Kwik source found for this episode', { status: 404 });

    } catch (e) {
      return new Response('Extractor error: ' + e.message, { status: 500 });
    }
  }
};

async function getKwikSources(anilistId, episode, mode) {
  const attempts = [
    `https://api.consumet.org/anime/gogoanime/\( {await getSlug(anilistId)}-episode- \){episode}`,
    `https://api.consumet.org/anime/zoro/\( {anilistId}-episode- \){episode}`
  ];

  for (const apiUrl of attempts) {
    try {
      const res = await fetch(apiUrl, { 
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } 
      });
      if (!res.ok) continue;
      const data = await res.json();

      let sources = data.sources || [];
      if (data.streamingUrl) sources = [{ url: data.streamingUrl }];

      const kwikLink = sources.find(s => 
        s.url && (s.url.includes('kwik.to') || s.url.includes('kwik.si') || s.url.endsWith('.mp4'))
      );

      if (kwikLink) return [kwikLink];
    } catch (e) {}
  }
  return [];
}

async function getSlug(anilistId) {
  try {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query($id:Int){Media(id:$id){title{romaji}}}`,
        variables: { id: parseInt(anilistId) }
      })
    });
    const json = await res.json();
    const title = json?.data?.Media?.title?.romaji || `anime-${anilistId}`;
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  } catch(e) {
    return `anime-${anilistId}`;
  }
}
