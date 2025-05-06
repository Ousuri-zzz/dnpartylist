type FeedData = {
  merchantDiscord: Record<string, string>;
  // ... existing code ...
};

type FeedItem = {
  id: string;
  text: string;
  timestamp: number;
  merchantDiscord?: Record<string, string>;
};

const formatTimestamp = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const replaceDiscordNames = (text: string, feedData: FeedData) => {
  if (!feedData.merchantDiscord || Object.keys(feedData.merchantDiscord).length === 0) {
    return text;
  }
  
  // Handle both @<id> and <id> formats
  const regex = /(@?<[^>]+>)/g;
  return text.replace(regex, (match) => {
    const id = match.replace(/[@<>]/g, '');
    return feedData.merchantDiscord[id] || match;
  });
};

const renderFeedItem = (item: FeedItem) => {
  if (!item) return null;

  const feedData = {
    merchantDiscord: item.merchantDiscord || {}
  };

  const text = replaceDiscordNames(item.text || '', feedData);
  
  return (
    <div key={item.id} className="p-4 border-b">
      <div className="text-sm text-gray-600">
        {formatTimestamp(item.timestamp)}
      </div>
      <div className="mt-1">
        {text}
      </div>
    </div>
  );
}; 