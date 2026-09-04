// Daily C++ Interview Q114: What are the advantages of const_iterators over iterators?
// Key: A `const_iterator` allows traversal without mutation through that iterator, works
// naturally with const containers, and communicates read-only intent to the compiler and
// reviewer. It does not make the underlying container globally immutable through other aliases.
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    const std::vector<int> values{1, 2, 3};
    const auto found = std::find(values.cbegin(), values.cend(), 2);
    if (found != values.cend()) std::cout << *found << '\n';
}
