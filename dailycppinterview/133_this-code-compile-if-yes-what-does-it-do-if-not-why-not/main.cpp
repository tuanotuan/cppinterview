// Daily C++ Interview Q133: Does this code compile? If yes, what does it do? If not, why not?
// Key: It does not compile at the member call. `MyObject o();` declares a function named `o`
// returning `MyObject`; it does not construct an object. Use `MyObject o;` or `MyObject o{};`.
class MyObject {
public:
    void doSomething() {}
};

int main() {
#if 0
    MyObject o(); // declares a function
    o.doSomething();
#endif
    MyObject object{};
    object.doSomething();
}
