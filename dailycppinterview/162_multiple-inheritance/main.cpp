// Real-World C++ Interviews Q162: What is multiple inheritance, and what problems can it cause?
// Key: Multiple inheritance lets one class derive from more than one base. It can create
// ambiguous member lookup, duplicated base subobjects in a diamond, more complex construction
// order, and tighter coupling; virtual inheritance can make a diamond share one virtual base
// but adds its own complexity. Multiple inheritance works best for small orthogonal interfaces,
// while composition is usually clearer for combining stateful implementations.
#include <iostream>

struct Printable {
    virtual ~Printable() = default;
    virtual void print() const = 0;
};

struct Identifiable {
    virtual ~Identifiable() = default;
    virtual int id() const = 0;
};

class Report final : public Printable, public Identifiable {
public:
    void print() const override { std::cout << "report " << id() << std::endl; }
    int id() const override { return 7; }
};

int main() {
    const Report report;
    report.print();
}
