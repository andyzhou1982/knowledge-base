import { Tree } from 'antd';
import { FileTextOutlined, FolderOutlined } from '@ant-design/icons';
import React from 'react';
import type { DataNode } from 'antd/es/tree';

export interface TreeNode {
  title: string;
  key: string;
  isLeaf?: boolean;
  children?: TreeNode[];
}

interface DocTreeProps {
  treeData: TreeNode[];
  onSelect: (key: string) => void;
  selectedKey?: string;
}

const { DirectoryTree } = Tree;

const DocTree: React.FC<DocTreeProps> = ({ treeData, onSelect, selectedKey }) => {
  const renderTreeNodes = (nodes: TreeNode[]): DataNode[] =>
    nodes.map((node) => ({
      title: node.title,
      key: node.key,
      isLeaf: node.isLeaf,
      icon: node.isLeaf ? <FileTextOutlined /> : <FolderOutlined />,
      children: node.children ? renderTreeNodes(node.children) : undefined,
    }));

  return (
    <DirectoryTree
      treeData={renderTreeNodes(treeData)}
      onSelect={(keys) => {
        if (keys.length > 0) {
          const key = keys[0] as string;
          if (key.endsWith('.md')) {
            onSelect(key);
          }
        }
      }}
      selectedKeys={selectedKey ? [selectedKey] : []}
      defaultExpandAll
    />
  );
};

export default DocTree;
