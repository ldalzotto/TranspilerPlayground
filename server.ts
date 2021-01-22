

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
        ID = 1,
        OP_EQ = 2,
        OP_ADD = 3,
        OP_MIN = 4,
        OP_MUL = 5,
        OP_DIV = 6,
        OP_ADD_EQ = 7,
        OP_COLON = 8,
        NUMBER = 9,
        SEMICOLON = 10
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
            else if (!isNaN(parseInt(p_str)) || !isNaN(parseFloat(p_str)))
            {
                this.type = TokenType.NUMBER;
            }
            else
            {
                this.type = TokenType.ID;
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
        ROOT = 0,
        BLOCK = 1,
        VARIABLE_ASSIGNMENT = 2,
        IDENTIFIER = 3
    };

    class TokenSlice
    {
        public begin: number;
        public end: number;

        public constructor(p_begin: number, p_end: number)
        {
            this.begin = p_begin;
            this.end = p_end;
        };

        public get_relative(p_index: number, p_tokens: tk.Token[]): tk.Token
        {
            if ((p_index + this.begin) >= this.end)
            {
                process.exit(400);
            }

            return p_tokens[p_index];
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


    let split_assignment_node = function (p_tree: Tree, p_node: number, p_tokens: tk.Token[])
    {
        let l_node: Node = p_tree.nodes[p_node];
        if (l_node.tokens.get_relative(1, p_tokens).type === tk.TokenType.OP_COLON)
        {
            if (l_node.tokens.get_relative(3, p_tokens).type === tk.TokenType.OP_EQ)
            {

            }
        }
        else if (l_node.tokens.get_relative(1, p_tokens).type === tk.TokenType.OP_EQ)
        {
            p_tree.push_node(new Node(NodeType.IDENTIFIER, new TokenSlice(l_node.tokens.begin, 1)), p_node);
            // p_tree.push_node(new Node(NodeType.NUMERICAL, new TokenSlice(l_node.tokens.begin + 2, 3)), p_node);
        }
    };

    /*
        l_variable = 10;
        l_variable += 1;
    */

    let split_block_node = function (p_tree: Tree, p_node: number, p_tokens: tk.Token[])
    {

        let l_current_parent_index = 0;

        let l_start_index = 0;

        for (let i = 0; i < p_tokens.length; i++)
        {
            let l_token = p_tokens[i];
            if (l_token.type == tk.TokenType.SEMICOLON)
            {
                p_tree.push_node(new Node(NodeType.VARIABLE_ASSIGNMENT, new TokenSlice(l_start_index, i)), l_current_parent_index);
                split_assignment_node(p_tree, p_tree.nodes.length - 1, p_tokens);

                l_start_index = i;

                /* 
                // vriable assignment ?
                if (p_tokens[i + 1].type === tk.TokenType.OP_EQ || p_tokens[i + 1].type === tk.TokenType.OP_ADD_EQ) 
                {
                    l_tree.push_node(new Node(NodeType.VARIABLE_ASSIGNMENT, l_token));
                }
                */
            };
        }
    };

    export let to_ast = function (p_tokens: tk.Token[]): Tree
    {
        let l_tree: Tree = new Tree();

        l_tree.push_root_node(new Node(NodeType.ROOT, new TokenSlice(0, p_tokens.length)));
        split_block_node(l_tree, l_tree.nodes.length - 1, p_tokens);

        return l_tree;

    };

}


ast.to_ast(
    tk.tokenize(format(`
    l_variable = 10;
    l_variable += 1;
    l_another_variable = l_variable + 10;
    l_variable_2 = 3;
    l_variable_3 = l_variable + l_variable_2;
    l_variable = 10 + l_variable;
    `))
);

/*
struct TestStruct[A, B]
{
    def hello = () => {

    };
};
*/