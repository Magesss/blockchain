// 二叉树前序遍历
function preOrderTraversal(root) {
    if (!root) return;
    
    const stack = [root];

    while (stack.length) {
        const node = stack.pop();
        console.log(node.value);
        if (node.right) stack.push(node.right);
        if (node.left) stack.push(node.left);
    }

    return stack
}

// 二叉树的层级遍历
function levelOrderTraversal(root) {
    if (!root) return;

    const queue = [root];
    const result = [];

    while (queue.length) {
        const node = queue.shift();
        result.push(node.value);
        if (node.left) queue.push(node.left);
        if (node.right) queue.push(node.right);
    }

    return result;
}   