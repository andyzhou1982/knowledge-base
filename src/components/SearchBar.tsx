import { Input, List } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import React, { useState, useCallback } from 'react';

interface SearchResult {
  relativePath: string;
  title: string;
  score: number;
}

interface SearchBarProps {
  onSearch: (query: string) => SearchResult[];
  onSelect: (relativePath: string, highlightTerms: string[]) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, onSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);

  const handleSearch = useCallback(
    (value: string) => {
      setQuery(value);
      if (value.trim()) {
        setResults(onSearch(value.trim()));
      } else {
        setResults([]);
      }
    },
    [onSearch]
  );

  return (
    <div className="kb-search">
      <Input
        placeholder="搜索文档..."
        prefix={<SearchOutlined />}
        allowClear
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
      />
      {results.length > 0 && (
        <List
          className="kb-search-results"
          size="small"
          dataSource={results}
          renderItem={(item) => (
            <List.Item
              onClick={() => {
                const terms = query.trim().split(/\s+/).filter(Boolean);
                onSelect(item.relativePath, terms);
                setResults([]);
                setQuery('');
              }}
            >
              <div style={{ width: '100%', overflow: 'hidden' }}>
                <div className="kb-search-result-title">{item.title}</div>
                <div className="kb-search-result-path">{item.relativePath}</div>
              </div>
            </List.Item>
          )}
        />
      )}
    </div>
  );
};

export default SearchBar;
