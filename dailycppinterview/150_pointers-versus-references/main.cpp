// Real-World C++ Interviews Q150: What is a pointer in C++, and how is it different from a
// reference?
// Key: A pointer is an object that stores an address; it can be null, reseated, copied, and,
// for array elements, used in pointer arithmetic. A reference is an alias bound during
// initialization and cannot later be reseated; ordinary references must denote a valid object
// or function whenever used. Neither form implies ownership by itself, so ownership must be
// expressed separately, preferably with RAII types.
#include <iostream>

int main() {
    int first = 10;
    int second = 20;
    int* pointer = &first;
    int& reference = first;

    pointer = &second;
    reference = 30;

    std::cout << first << ' ' << *pointer << std::endl;
}
