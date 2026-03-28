export class TreeNode {
  public value: string;
  public children: TreeNode[];
  
  constructor(value: string) {
    this.value = value;
    this.children = [];
  }
}

export function parseTreeString(str: string): TreeNode | null {
  if (!str || str.length < 2) return null;
  
  // 去除最外层的花括号
  str = str.trim();
  if (str[0] === '{' && str[str.length - 1] === '}') {
    str = str.substring(1, str.length - 1);
  }
  
  return parseNode(str);
}

function parseNode(content: string): TreeNode {
  const root = new TreeNode('');
  let current = '';
  let depth = 0;
  let i = 0;
  
  while (i < content.length) {
    const char = content[i];
    
    if (char === '{') {
      depth++;
      if (depth === 1 && current) {
        // 当前节点有子节点
        const node = new TreeNode(current.trim());
        const closingBraceIndex = findMatchingBrace(content, i);
        const childContent = content.substring(i + 1, closingBraceIndex);
        
        // 递归解析子节点
        const childNode = parseNode(childContent);
        if (childNode) {
          if (childNode.value) {
            // 如果子节点有值，作为第一个子节点
            node.children.push(new TreeNode(childNode.value));
          }
          node.children.push(...childNode.children);
        }
        
        root.children.push(node);
        i = closingBraceIndex;
        current = '';
      }
    } else if (char === '}') {
      depth--;
    } else if (char === ',' && depth === 0) {
      // 同级别节点分隔
      if (current.trim()) {
        root.children.push(new TreeNode(current.trim()));
      }
      current = '';
    } else {
      current += char;
    }
    
    i++;
  }
  
  // 处理最后一个节点
  if (current.trim()) {
    root.children.push(new TreeNode(current.trim()));
  }
  
  return root;
}

function findMatchingBrace(str: string, start: number): number {
  let depth = 1;
  for (let i = start + 1; i < str.length; i++) {
    if (str[i] === '{') depth++;
    else if (str[i] === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}