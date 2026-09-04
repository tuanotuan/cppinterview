// Daily C++ Interview Q132: What is the most vexing parse?
// Key: The most vexing parse is C++'s rule for a syntactically ambiguous statement: if it can
// be parsed as a declaration, it is treated as a declaration. Braced initialization or an
// unambiguous variable form removes the ambiguity.
struct Value {};

Value make_value() {
    Value value{};
    return value;
}

int main() {
    Value object{};
    (void)object;
}
