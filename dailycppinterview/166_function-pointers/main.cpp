// Real-World C++ Interviews Q166: What is a function pointer, and how do you use it?
// Key: A function pointer stores the address of a free or static function with a specific
// signature and supports indirect calls, callbacks, and dispatch tables. It can be null or
// reseated, and a captureless lambda can convert to a compatible function pointer. Non-static
// member-function pointers use a different type and require an object; `std::function` adds
// type erasure and stateful callable support but also has more overhead than a raw function
// pointer.
#include <array>
#include <iostream>

int add(int left, int right) {
    return left + right;
}

int multiply(int left, int right) {
    return left * right;
}

using Operation = int (*)(int, int);

int main() {
    const std::array<Operation, 2> operations{&add, &multiply};
    for (const Operation operation : operations) {
        std::cout << operation(3, 4) << ' ';
    }
    std::cout << std::endl;
}
