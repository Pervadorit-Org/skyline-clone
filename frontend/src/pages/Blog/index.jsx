import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getBlogList } from '../../api/blog';
import { site } from '../../config/site';
import { usePageContentReady } from '../../context/PageReadyContext';
import { formatBlogDate } from '../../utils/blogHtml';
import './blog-list.css';

function buildCategories(posts) {
  const set = new Set();
  posts.forEach((p) => {
    if (p.category && String(p.category).trim()) set.add(String(p.category).trim());
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export function Blog() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [searchParams] = useSearchParams();
  const category = searchParams.get('category') || 'All';

  usePageContentReady(!loading);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    getBlogList()
      .then((res) => {
        if (!cancelled) setPosts(res?.blog_posts ?? []);
      })
      .catch((err) => {
        if (!cancelled) {
          setPosts([]);
          setError(err.message || 'Failed to load blog posts');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(() => buildCategories(posts), [posts]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter((p) => {
      if (category !== 'All' && String(p.category || '').trim() !== category) return false;
      return !q || String(p.title || '').toLowerCase().includes(q);
    });
  }, [posts, category, query]);

  return (
    <section className="bl-page">
      <header className="bl-head">
        <h1>Blog</h1>
        <p>News and updates from {site.platformName}.</p>
      </header>

      <div className="bl-tools">
        <label className="bl-search">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m21 21-4.34-4.34" />
            <circle cx="11" cy="11" r="8" />
          </svg>
          <input
            type="search"
            placeholder="Search posts"
            aria-label="Search posts"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        {categories.length > 0 && (
          <div className="bl-cats">
            <Link to="/blog" className={`bl-chip${category === 'All' ? ' is-active' : ''}`}>All</Link>
            {categories.map((cat) => (
              <Link
                key={cat}
                to={`/blog?category=${encodeURIComponent(cat)}`}
                className={`bl-chip${category === cat ? ' is-active' : ''}`}
              >
                {cat}
              </Link>
            ))}
          </div>
        )}
      </div>

      {loading && <p className="bl-status">Loading posts…</p>}
      {!loading && error && <p className="bl-status bl-status--error">{error}</p>}
      {!loading && !error && filtered.length === 0 && <p className="bl-status">No blog posts found.</p>}

      {!loading && !error && filtered.length > 0 && (
        <div className="bl-grid">
          {filtered.map((post) => (
            <Link key={post.id} to={`/blog/${post.slug}`} className="bl-card">
              {post.titleImage ? (
                <img
                  src={post.titleImage}
                  alt={post.titleImageAlt || post.title || ''}
                  width="750"
                  height="463"
                  loading="lazy"
                  className="bl-card-img"
                />
              ) : (
                <div className="bl-card-img bl-card-img--empty" aria-hidden="true" />
              )}
              <div className="bl-card-body">
                {post.category ? <span className="bl-card-cat">{post.category}</span> : null}
                <h2>{post.title}</h2>
                {post.createdAt ? <time dateTime={post.createdAt}>{formatBlogDate(post.createdAt)}</time> : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
