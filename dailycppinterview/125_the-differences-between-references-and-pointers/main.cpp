// Real-World C++ Interviews Q125: What are the differences between references and pointers?
// Key: A reference is an alias that must be initialized and cannot be reseated, while a pointer
// is an object that may be null, reassigned, and used in pointer arithmetic where valid. Both
// can dangle, and neither alone expresses ownership.
#include <iostream>

void increment(int& value) { ++value; }
void reset(int* value) { if (value) *value = 0; }

int main() {
    int value = 1;
    increment(value);
    reset(&value);
    std::cout << value << '\n';
}
