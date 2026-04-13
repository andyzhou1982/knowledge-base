import { Input, List, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import React, { useState, useCallback } from 'react';

const { Text } = Typography;

interface SearchResult {
  relativePath: string;
  title: string;
  score: number;
}

interface SearchBarProps {
  onSearch: (query: string) => SearchResult[];
  onSelect: (relativePath: string) => void;
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
    <div style={{ padding: '8px 12px' }}>
      <Input
        placeholder="搜索文档..."
        prefix={<SearchOutlined />}
        allowClear
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
      />
      {results.length > 0 && (
        <List
          size="small"
          dataSource={results}
          style={{ marginTop: 8, maxHeight: 300, overflowY: 'auto' }}
          renderItem={(item) => (
            <List.Item
              style={{ cursor: 'pointer', padding: '6px 12px' }}
              onClick={() => {
                onSelect(item.relativePath);
                setResults([]);
                setQuery('');
              }}
            >
              <Text ellipsis style={{ maxWidth: '100%' }}>
                {item.title}
                <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                  {item.relativePath}
                </Text>
              </Text>
            </List.Item>
          )}
        />
      )}
    </div>
  );
};

export default SearchBar;
