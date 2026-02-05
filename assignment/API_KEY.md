# Claude API Key

An API key will be provided to you separately via email.

## Rate Limits

Your key will have the following limits:
- **Requests per minute**: 60
- **Tokens per day**: 100,000

This should be sufficient for the assignment. If you hit rate limits, wait a moment and retry.

## Usage

### Python (anthropic SDK)

```python
import anthropic

client = anthropic.Anthropic(api_key="YOUR_KEY_HERE")

message = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    messages=[
        {"role": "user", "content": "Hello, Claude"}
    ]
)
```

### Node.js

```javascript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: 'YOUR_KEY_HERE' });

const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
        { role: "user", content: "Hello, Claude" }
    ]
});
```

## Best Practices

1. **Cache responses** — Don't call the API for identical inputs
2. **Batch efficiently** — Process multiple shifts in one call where logical
3. **Use appropriate token limits** — Don't request 4096 tokens if 500 will do
4. **Handle errors gracefully** — Retry with backoff on rate limits
