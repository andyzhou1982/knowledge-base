import { useState, useEffect, useCallback, useMemo } from 'react';
import { ConfigProvider, Layout, Typography, Spin, Empty, theme } from 'antd';
import { BookOutlined } from '@ant-design/icons';
import DocTree, { type TreeNode } from './components/DocTree';
import MarkdownViewer from './components/MarkdownViewer';
import SearchBar from './components/SearchBar';
import { BM25Search, type DocIndex } from './utils/search';
import './App.css';

const { Sider, Content, Header } = Layout;
const { Title } = Typography;

const HEADER_HEIGHT = 52;

function App() {
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | undefined>();
  const [content, setContent] = useState('');
  const [highlightTerms, setHighlightTerms] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);

  const bm25 = useMemo(() => new BM25Search(), []);

  useEffect(() => {
    Promise.all([
      fetch('/docs-tree.json').then((r) => r.json()),
      fetch('/search-index.json').then((r) => r.json()),
    ])
      .then(([tree, docs]: [TreeNode[], DocIndex[]]) => {
        setTreeData(tree);
        bm25.init(docs);
      })
      .catch(console.error)
      .finally(() => setInitLoading(false));
  }, [bm25]);

  const loadDoc = useCallback(async (relativePath: string, terms?: string[]) => {
    setLoading(true);
    setSelectedKey(relativePath);
    setHighlightTerms(terms || []);
    try {
      const res = await fetch(`/docs/${relativePath}`);
      const text = await res.text();
      setContent(text);
    } catch {
      setContent('# 加载失败\n\n无法加载该文档。');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = useCallback(
    (query: string) => bm25.search(query),
    [bm25]
  );

  if (initLoading) {
    return (
      <div className="kb-init-loading">
        <Spin size="large" tip="加载知识库..." />
      </div>
    );
  }

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#818cf8',
          borderRadius: 8,
        },
      }}
    >
      <Layout style={{ height: '100vh' }}>
        <Header
          className="kb-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0 24px',
            height: HEADER_HEIGHT,
            lineHeight: `${HEADER_HEIGHT}px`,
          }}
        >
          <Title level={4} className="kb-header-title">
            知识库
            <span className="title-accent" />
          </Title>
        </Header>
        <Layout style={{ background: 'transparent' }}>
          <ConfigProvider
            theme={{
              algorithm: theme.darkAlgorithm,
              token: {
                colorPrimary: '#818cf8',
                borderRadius: 8,
                colorBgContainer: '#09090f',
                colorBgElevated: '#111118',
                colorBorder: 'rgba(255,255,255,0.06)',
                colorText: '#e4e4e7',
                colorTextSecondary: '#71717a',
                colorTextPlaceholder: '#4a4a5e',
              },
            }}
          >
            <Sider
              className="kb-sidebar"
              width={300}
              style={{
                overflow: 'auto',
                height: `calc(100vh - ${HEADER_HEIGHT}px)`,
              }}
            >
              <SearchBar onSearch={handleSearch} onSelect={(path, terms) => loadDoc(path, terms)} />
              <div style={{ padding: '0 12px' }}>
                <DocTree treeData={treeData} onSelect={loadDoc} selectedKey={selectedKey} />
              </div>
            </Sider>
          </ConfigProvider>
          <Content
            className="kb-content"
            style={{
              background: '#fdfdfd',
              height: `calc(100vh - ${HEADER_HEIGHT}px)`,
              overflow: 'hidden',
            }}
          >
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 100 }}>
                <Spin size="large" />
              </div>
            ) : content ? (
              <MarkdownViewer content={content} highlightTerms={highlightTerms} />
            ) : (
              <div className="kb-empty-state">
                <div className="kb-empty-icon">
                  <BookOutlined />
                </div>
                <Empty description="请从左侧选择文档查看" />
              </div>
            )}
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}

export default App;
