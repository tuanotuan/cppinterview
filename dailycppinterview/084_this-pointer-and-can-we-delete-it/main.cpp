// Real-World C++ Interviews Q084: What is this pointer and can we delete it?
// Key: `this` is the implicit pointer to the current object in a non-static member function.
// `delete this` is technically possible only under a very strict self-ownership contract for a
// heap object with no later access, but it is brittle and should normally be replaced by
// explicit ownership.
#include <iostream>

struct Value {
    int number;
    void show() const {
        std::cout << this->number << '\n';
    }
};

int main() {
    Value value{42};
    value.show();
}
