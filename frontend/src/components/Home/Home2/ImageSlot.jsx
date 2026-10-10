// Renders an image when a config slot has a real src; otherwise a neutral
// placeholder (card color + subtle border) so missing assets never hotlink
// or break layout. See homeConfig.js for which slots are still empty.
export function ImageSlot({ src, alt = '', className = '', style, width, height, loading = 'lazy' }) {
  if (!src) {
    return (
      <div
        className={`df-home2-placeholder ${className}`}
        style={style}
        role="img"
        aria-label={alt || 'Image coming soon'}
      >
        {/* TODO: replace asset */}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      width={width}
      height={height}
      loading={loading}
      decoding="async"
    />
  );
}

export default ImageSlot;
