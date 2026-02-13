package richtext

import (
	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/ast"
	"github.com/yuin/goldmark/extension"
	"github.com/yuin/goldmark/text"
)

// ParseMarkdown parses Markdown text and returns the AST root node
func ParseMarkdown(source []byte) (ast.Node, error) {
	parser := goldmark.New(
		goldmark.WithExtensions(
			extension.Strikethrough,
		),
	)
	reader := text.NewReader(source)

	doc := parser.Parser().Parse(reader)
	return doc, nil
}
