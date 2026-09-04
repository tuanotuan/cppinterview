// Real-World C++ Interviews Q078: What is constructor delegation?
// Key: Constructor delegation lets one constructor call another constructor of the same class
// in its initializer list. The target constructor initializes the object first, after which the
// delegating constructor's body runs; delegation cannot be mixed with other member
// initializers.
struct Value {
    Value() : Value(42) {}
    explicit Value(int value) : value(value) {}
    int value;
};

int main() {
    Value value;
    return value.value == 42 ? 0 : 1;
}
