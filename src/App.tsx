import { useState, useEffect, useCallback, useMemo } from 'react';
import { ConfigProvider, Layout, Typography, Spin, Empty } from 'antd';
import DocTree, { type TreeNode } from './components/DocTree';
import MarkdownViewer from './components/MarkdownViewer';
import SearchBar from './components/SearchBar';
import { BM25Search, type DocIndex } from './utils/search';
import './App.css';

const { Sider, Content, Header } = Layout;
const { Title } = Typography;

function App() {
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | undefined>();
  const [content, setContent] = useState('');
  const [highlightTerms, setHighlightTerms] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);

  const bm25 = useMemo(() => new BM25Search(), []);

  // Load tree and search index on mount
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

  // Load markdown content
  const loadDoc = useCallback(async (relativePath: string, terms?: string[]) => {
    setLoading(true);
    setSelectedKey(relativePath);
    setHighlightTerms(terms || []);
    try {
      const res = await fetch(`/docs/${relativePath}`);
      const text = await res.text();
      setContent(text);
    } catch (err) {
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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="加载知识库..." />
      </div>
    );
  }

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 6,
        },
      }}
    >
      <Layout style={{ height: '100vh' }}>
        <Header
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0 24px',
            background: '#fff',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <Title level={4} style={{ margin: 0 }}>
            知识库
          </Title>
        </Header>
        <Layout>
          <Sider
            width={300}
            style={{
              background: '#fff',
              borderRight: '1px solid #f0f0f0',
              overflow: 'auto',
              height: 'calc(100vh - 64px)',
            }}
          >
            <SearchBar onSearch={handleSearch} onSelect={(path, terms) => loadDoc(path, terms)} />
            <div style={{ padding: '0 12px' }}>
              <DocTree treeData={treeData} onSelect={loadDoc} selectedKey={selectedKey} />
            </div>
          </Sider>
          <Content style={{ background: '#fff', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 100 }}>
                <Spin size="large" />
              </div>
            ) : content ? (
              <MarkdownViewer content={content} highlightTerms={highlightTerms} />
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
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
