// Daily C++ Interview Q139: Can you safely compare signed and unsigned integers?
// Key: Mixed signed/unsigned comparison can convert a negative signed value to a large unsigned
// value. In C++20 use `std::cmp_equal`, `std::cmp_less`, and related helpers, or perform an
// explicit range check before converting to one known common type.
#include <utility>

int main() {
    const int signed_value = -3;
    const unsigned unsigned_value = 7;
    return std::cmp_less(signed_value, unsigned_value) ? 0 : 1;
}
