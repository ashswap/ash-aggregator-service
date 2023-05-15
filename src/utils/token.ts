export const formatTokenIdentifier = (tokenId: string) => {
    if(!tokenId) return '';
    const parts = tokenId.toLowerCase().split('-');
    return [parts[0].toUpperCase(), parts.slice(1)].join('-');
}