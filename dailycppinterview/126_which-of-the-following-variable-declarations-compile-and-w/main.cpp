// Real-World C++ Interviews Q126: Which of the following variable declarations compile and what
// would be the value of a?
// Key: Declarations 1, 2, and 3 compile. The first two produce 42; assigning `-42` converts
// modulo one more than the maximum unsigned value, while braced initialization in declaration 4
// rejects that non-constant narrowing conversion.
#include <limits>

int main() {
    unsigned int first = 42;
    unsigned int second{42};
    unsigned int third = -42;
#if 0
    unsigned int fourth{-42}; // narrowing: ill-formed
#endif
    return first == second && third == std::numeric_limits<unsigned int>::max() - 41 ? 0 : 1;
}
