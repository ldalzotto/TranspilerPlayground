

let format = function (p_input: string): string
{
    let l_i = p_input;
    l_i = l_i.replace(/(\r\n|\n|\r)/gm, ""); // remove line return
    l_i = l_i.replace(/( )\1+/gm, ""); // remove multiple consecutive space
    l_i = l_i.replace(/;/gm, " ; "); // to ensure that ; are tokenized
    l_i = l_i.replace(/\[/gm, " [ ");
    l_i = l_i.replace(/]/gm, " ] ");
    l_i = l_i.replace(/{/gm, " { ");
    l_i = l_i.replace(/}/gm, " } ");
    l_i = l_i.replace(/\(/gm, " ( ");
    l_i = l_i.replace(/\)/gm, " ) ");
    l_i = l_i.replace(/,/gm, " , ");
    return l_i;
}

namespace tk
{
    export enum TokenType
    {
        STRING,
        VAR,
        OP_EQ,
        OP_ADD,
        OP_MIN,
        OP_MUL,
        OP_DIV,
        OP_ADD_EQ,
        OP_COLON,
        NUMBER,
        SEMICOLON
    };

    export class Token
    {
        public type: TokenType;
        public str: string;

        public constructor(p_str: string)
        {
            if (p_str === '=')
            {
                this.type = TokenType.OP_EQ;
            }
            else if (p_str === '+')
            {
                this.type = TokenType.OP_ADD;
            }
            else if (p_str === '-')
            {
                this.type = TokenType.OP_MIN;
            }
            else if (p_str === '*')
            {
                this.type = TokenType.OP_MUL;
            }
            else if (p_str === '/')
            {
                this.type = TokenType.OP_DIV;
            }
            else if (p_str === "+=")
            {
                this.type = TokenType.OP_ADD_EQ;
            }
            else if (p_str === ':')
            {
                this.type = TokenType.OP_COLON;
            }
            else if (p_str === ';')
            {
                this.type = TokenType.SEMICOLON;
            }
            else if (p_str === "var")
            {
                this.type = TokenType.VAR;
            }
            else if (!isNaN(parseInt(p_str)) || !isNaN(parseFloat(p_str)))
            {
                this.type = TokenType.NUMBER;
            }
            else
            {
                this.type = TokenType.STRING;
            }
            this.str = p_str;
        };
    };

    export let tokenize = function (p_input: string): Token[]
    {
        let l_tokens: Token[] = [];

        let l_current_index = 0;
        let l_new_index = p_input.indexOf(' ', l_current_index);
        while (l_new_index != -1)
        {
            l_tokens.push(new Token(p_input.slice(l_current_index, l_new_index)));
            l_current_index = l_new_index + 1;
            l_new_index = p_input.indexOf(' ', l_current_index);
        }

        // l_tokens.push(new Token(TokenType.UNKNOWN, p_input.slice(p_input.lastIndexOf(' '), p_input.length)));

        return l_tokens;
    };
}

namespace ast 
{

    enum NodeType
    {
        ROOT,
        BLOCK,
        VARIABLE_ASSIGNMENT,
        VARIABLE_ASSIGNMENT_VALUE,
        VARIABLE_DECLARATION,
        BINARY_OPERATION,
        BINARY_OPERATION_TYPE,
        IDENTIFIER,
        NUMBER
    };

    class TokenSlice
    {
        public begin: number;
        public size: number;

        public constructor(p_begin: number, p_size: number)
        {
            this.begin = p_begin;
            this.size = p_size;
        };

        public get_relative(p_index: number, p_tokens: tk.Token[]): tk.Token
        {
            if (p_index >= this.size)
            {
                console.error("get_relative : wrong index")
                //process.exit(400);
            }

            return p_tokens[this.begin + p_index];
        }
    };

    class Node
    {
        public type: NodeType;
        public tokens: TokenSlice;
        public parent: number
        public childs: number[] = [];
        public constructor(p_type: NodeType, p_tokens: TokenSlice)
        {
            this.type = p_type;
            this.tokens = p_tokens;
        };
    };

    class Tree
    {
        public nodes: Node[] = [];

        public push_node(p_node: Node, p_parent: number)
        {
            let l_node = p_node;
            l_node.parent = p_parent;
            this.nodes.push(l_node);
            this.nodes[p_parent].childs.push(this.nodes.length - 1);
        };

        public push_root_node(p_node: Node)
        {
            this.nodes.push(p_node);
        }
    };

    let push_number_or_string = function (p_tree: Tree, p_node: number, p_token: number, p_tokens: tk.Token[]): boolean
    {
        if (p_tokens[p_token].type === tk.TokenType.NUMBER)
        {
            p_tree.push_node(new Node(NodeType.NUMBER, new TokenSlice(p_token, 1)), p_node);
            return true;
        }
        else if (p_tokens[p_token].type === tk.TokenType.STRING)
        {
            p_tree.push_node(new Node(NodeType.IDENTIFIER, new TokenSlice(p_token, 1)), p_node);
            return true;
        }
        return false;
    };


    let split_assignement_value_node = function (p_tree: Tree, p_node: number, p_tokens: tk.Token[])
    {
        let l_node: Node = p_tree.nodes[p_node];

        if (l_node.tokens.size > 1 && l_node.tokens.get_relative(1, p_tokens).type === tk.TokenType.OP_ADD) //TODO or other operations
        {
            p_tree.push_node(new Node(NodeType.VARIABLE_DECLARATION, new TokenSlice(l_node.tokens.begin, l_node.tokens.size)), p_node);

            let l_binary_op_node: number = p_tree.nodes.length - 1;
            let l_binary_op_node_val: Node = p_tree.nodes[l_binary_op_node];

            p_tree.push_node(new Node(NodeType.BINARY_OPERATION_TYPE, new TokenSlice(l_binary_op_node_val.tokens.begin + 1, 1)), p_node);
            push_number_or_string(p_tree, l_binary_op_node, l_binary_op_node_val.tokens.begin, p_tokens);

            push_number_or_string(p_tree, l_binary_op_node, l_binary_op_node_val.tokens.begin + 2, p_tokens);
            //(after) check for further tokens
        }
        else
        {
            push_number_or_string(p_tree, p_node, l_node.tokens.begin, p_tokens);
        }
    }

    let split_assignment_node = function (p_tree: Tree, p_node: number, p_tokens: tk.Token[])
    {
        let l_node: Node = p_tree.nodes[p_node];
        if (l_node.tokens.get_relative(0, p_tokens).type === tk.TokenType.VAR)
        {
            p_tree.push_node(new Node(NodeType.VARIABLE_DECLARATION, new TokenSlice(l_node.tokens.begin, 2)), p_node);

            if (l_node.tokens.get_relative(2, p_tokens).type === tk.TokenType.OP_EQ)
            {
                p_tree.push_node(new Node(NodeType.VARIABLE_ASSIGNMENT_VALUE, new TokenSlice(l_node.tokens.begin + 3, l_node.tokens.size - 3)), p_node);
                split_assignement_value_node(p_tree, p_tree.nodes.length - 1, p_tokens);
            }

        }
        else if (l_node.tokens.get_relative(0, p_tokens).type === tk.TokenType.STRING)
        {
            p_tree.push_node(new Node(NodeType.IDENTIFIER, new TokenSlice(l_node.tokens.begin, 1)), p_node);

            if (l_node.tokens.get_relative(1, p_tokens).type === tk.TokenType.OP_EQ)
            {
                p_tree.push_node(new Node(NodeType.VARIABLE_ASSIGNMENT_VALUE, new TokenSlice(l_node.tokens.begin + 2, l_node.tokens.size - 2)), p_node);
                split_assignement_value_node(p_tree, p_tree.nodes.length - 1, p_tokens);
            }
        }
    };

    let split_block_node = function (p_tree: Tree, p_node: number, p_tokens: tk.Token[])
    {

        let l_current_parent_index = 0;

        let l_node: Node = p_tree.nodes[p_node];
        let l_start_index = 0;
        for (let i = 0; i < l_node.tokens.size; i++)
        {
            let l_token = l_node.tokens.get_relative(i, p_tokens);
            if (l_token.type == tk.TokenType.SEMICOLON)
            {
                p_tree.push_node(new Node(NodeType.VARIABLE_ASSIGNMENT, new TokenSlice(l_start_index, i - l_start_index)), l_current_parent_index);
                split_assignment_node(p_tree, p_tree.nodes.length - 1, p_tokens);

                l_start_index = i + 1;
            };
        }
    };

    export let to_ast = function (p_tokens: tk.Token[]): Tree
    {
        let l_tree: Tree = new Tree();

        let l_root_node = new Node(NodeType.ROOT, new TokenSlice(0, p_tokens.length));
        for (let i = 0; i < p_tokens.length; i++)
        {
            l_root_node.childs.push(i);
        }
        l_tree.push_root_node(l_root_node);
        split_block_node(l_tree, l_tree.nodes.length - 1, p_tokens);

        return l_tree;

    };

}


namespace ct
{
    class Variable
    {
        public type: string;
    };

    interface Variables
    {
        [p_name: string]: Variable;
    };

    class CodeBlock
    {
        public variables: Variables[];
    };

    class Context
    {
        public codeblocks: CodeBlock[];
    };

    // The goal of the context tree is to represent the ast but with variable names...
    // Every tokenization problems must be resolved when we are trying to translate the ContextTree to another language.
    class ContextTree
    {

    };

};