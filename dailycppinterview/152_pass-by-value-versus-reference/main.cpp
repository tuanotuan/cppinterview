// Real-World C++ Interviews Q152: What is the difference between pass by value and pass by
// reference?
// Key: A non-reference parameter is a separate object initialized from the argument, so
// modifying it does not modify the caller's object; copying or moving it may have a cost. A
// reference parameter binds to the caller's object: a non-const reference can modify it, while
// `const T&` provides read-only access and often avoids a copy. Choose by contract first—small
// value types are often best passed by value, and a reference is not automatically faster in
// every case.
#include <iostream>

int by_value(int value) {
    return value + 10;
}

void by_reference(int& value) {
    value += 10;
}

int main() {
    int first = 1;
    int second = 1;
    const int copied_result = by_value(first);
    by_reference(second);
    std::cout << first << ' ' << copied_result << ' ' << second << std::endl;
}
