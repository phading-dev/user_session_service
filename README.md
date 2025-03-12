## BigTable schema

```yaml
- row:
    key: u#${userSessionId}
    columns:
      - name: u:u # User id
        type: string
      - name: u:a # Account id
        type: string
      - name: u:t # renewed time ms
        type: number
      - name: u:v # capabilities version
      # Using empty string for false, and any character for true
      - name: u:cs # canConsume
        type: string
      - name: u:pb # canPublish
        type: string
      - name: u:bl # canBeBilled
        type: string
      - name: u:er # canEarn
        type: string
```